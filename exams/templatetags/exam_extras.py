from django import template

register = template.Library()

@register.filter
def get_item(dictionary, key):
    """Get item from dictionary by key"""
    return dictionary.get(key)

@register.filter
def question_type_color(value):
    mapping = {
        'multiple_choice': 'primary',
        'single_choice': 'info',
        'true_false': 'warning',
        'short_answer': 'secondary',
    }
    return mapping.get(value, 'secondary')

@register.filter
def question_type_icon(value):
    mapping = {
        'multiple_choice': 'list-ul',
        'single_choice': 'dot-circle',
        'true_false': 'check',
        'short_answer': 'keyboard',
    }
    return mapping.get(value, 'question')

@register.filter
def difficulty_color(value):
    mapping = {
        'easy': 'success',
        'medium': 'warning',
        'hard': 'danger',
    }
    return mapping.get(value, 'secondary')

@register.filter
def get_answer_text(short_answers, field_name):
    # field_name is like 'answer_123'
    answer_id = field_name.split('_')[-1]
    for answer in short_answers:
        if str(answer.id) == answer_id:
            return answer.text_answer or 'No answer provided'
    return '' 